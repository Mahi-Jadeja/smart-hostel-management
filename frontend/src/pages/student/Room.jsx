import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, Building2, Layers, Users, Search, AlertCircle, MapPin, Home } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Skeleton from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import studentService from '../../services/student.service';
import toast from 'react-hot-toast';

const RoomCard = ({ room, isMyRoom, onClick }) => {
  const getStatusColor = (status, isMine) => {
    if (isMine) return 'border-primary bg-primary/5 shadow-lg shadow-primary/20';
    switch (status) {
      case 'empty': return 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10';
      case 'partial': return 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10';
      case 'full': return 'border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10';
      default: return 'border-border bg-muted/50';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'empty': return 'success';
      case 'partial': return 'warning';
      case 'full': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <motion.div
      layout
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        relative p-4 rounded-2xl border-2 transition-all cursor-pointer
        ${getStatusColor(room.status, isMyRoom)}
      `}
    >
      {isMyRoom && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          YOU
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-lg font-bold ${isMyRoom ? 'text-primary' : 'text-foreground'}`}>
          {room.room_no}
        </span>
        {!isMyRoom && <Badge status={getStatusBadge(room.status)} className="text-xs">{room.status}</Badge>}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        <span>{room.occupied}/{room.capacity}</span>
      </div>
      {isMyRoom && (
        <div className="mt-2 pt-2 border-t border-primary/20">
          <p className="text-xs text-primary font-medium">Your Room</p>
        </div>
      )}
    </motion.div>
  );
};

const Room = () => {
  const [layoutData, setLayoutData] = useState(null);
  const [myRoom, setMyRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAllocated, setIsAllocated] = useState(false);
  const [previewBlock, setPreviewBlock] = useState('');
  const [previewFloor, setPreviewFloor] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [availableBlocks, setAvailableBlocks] = useState([]);

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        setLoading(true);
        const response = await studentService.getRoomLayout();
        const data = response.data.data;
        setIsAllocated(data.allocated);
        setLayoutData(data.layout);
        setMyRoom(data.my_room);
        if (data.layout && data.layout.length > 0) {
          const blocks = [...new Set(data.layout.map((r) => r.hostel_block))];
          setAvailableBlocks(blocks);
        }
      } catch (error) {
        toast.error('Failed to load room information');
      } finally {
        setLoading(false);
      }
    };
    fetchLayout();
  }, []);

  const handlePreview = async () => {
    if (!previewBlock) return toast.error('Please select a block');
    try {
      setPreviewLoading(true);
      const response = await studentService.getLayoutPreview(previewBlock, previewFloor);
      setPreviewData(response.data.data);
    } catch (error) {
      toast.error('Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Room Allocation</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAllocated) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Room Allocation</h1>
        
        <Card className="p-6 border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Not Allocated Yet</h2>
              <p className="text-muted-foreground mt-1">Contact the warden for room assignment. Meanwhile, browse available rooms below.</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Browse Hostel Layout
          </h2>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-foreground mb-1.5">Block</label>
              <select value={previewBlock} onChange={(e) => setPreviewBlock(e.target.value)} className="w-full px-4 py-2.5 bg-background border border-input rounded-lg">
                <option value="">Select Block</option>
                {availableBlocks.map((b) => <option key={b} value={b}>Block {b}</option>)}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-sm font-medium text-foreground mb-1.5">Floor</label>
              <select value={previewFloor} onChange={(e) => setPreviewFloor(Number(e.target.value))} className="w-full px-4 py-2.5 bg-background border border-input rounded-lg">
                {[1, 2, 3, 4, 5].map((f) => <option key={f} value={f}>Floor {f}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handlePreview} disabled={previewLoading || !previewBlock} className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium disabled:opacity-50">
                {previewLoading ? 'Loading...' : 'View Layout'}
              </motion.button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {previewLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
              </div>
            ) : previewData ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">Block {previewData.block} • Floor {previewData.floor}</h3>
                  <div className="flex gap-4 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500"></span> Empty</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500"></span> Partial</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500"></span> Full</span>
                  </div>
                </div>
                {previewData.rooms.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {previewData.rooms.map((room) => (
                      <RoomCard key={room.room_no} room={room} isMyRoom={false} />
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Building2} title="No rooms found" description="This floor has no rooms generated yet." />
                )}
              </motion.div>
            ) : (
              <EmptyState icon={MapPin} title="Select a block to preview" description="Choose a block and floor to see the room layout." />
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <h1 className="text-3xl font-bold text-foreground">Room Allocation</h1>

      {/* My Room Hero */}
      {myRoom && (
        <Card className="p-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex flex-col lg:flex-row justify-between gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="px-3 py-1 bg-primary text-primary-foreground text-sm font-bold rounded-full">
                  My Room
                </div>
                <span className="text-muted-foreground">Block {myRoom.block} • Floor {myRoom.floor} • Bed {myRoom.bed_no}</span>
              </div>
              <h2 className="text-4xl font-bold text-foreground mb-4">Room {myRoom.room_no}</h2>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <BedDouble className="w-5 h-5" />
                  <span>{myRoom.occupied}/{myRoom.capacity} Occupied</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  <span className="capitalize">{myRoom.status}</span>
                </div>
              </div>
            </div>

            <div className="lg:w-80 glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Roommates ({myRoom.roommates?.length || 0})
              </h3>
              {myRoom.roommates?.length > 0 ? (
                <div className="space-y-3">
                  {myRoom.roommates.map((mate) => (
                    <div key={mate.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-primary-foreground font-bold">
                        {mate.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{mate.name}</p>
                        <p className="text-xs text-muted-foreground">{mate.branch} • Year {mate.year}</p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">Bed {mate.bed_no}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">No roommates yet</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Floor Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-muted-foreground" />
          Floor {myRoom?.floor || layoutData?.[0]?.floor} Layout
        </h2>
        {layoutData && layoutData.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {layoutData.map((room) => (
              <RoomCard key={room._id || room.room_no} room={room} isMyRoom={room.is_my_room} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Building2} title="No layout data" description="Unable to load the floor layout." />
        )}
      </div>
    </motion.div>
  );
};

export default Room;